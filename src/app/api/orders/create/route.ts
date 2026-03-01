import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
   const supabase = createAdminClient();
    const body = await req.json();

    const {
      cartItems,
      totalAmount,
      restaurantId,
      paymentMethod,
      walletAmount = 0,
      promoCode = null,
      promoDiscount = 0,
      userId,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID missing" }, { status: 400 });
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 🔎 Recalculate total on server
    const calculatedTotal = cartItems.reduce(
      (sum: number, item: any) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    if (calculatedTotal !== Number(totalAmount)) {
      return NextResponse.json(
        { error: "Order total mismatch" },
        { status: 400 }
      );
    }

    const finalAmount = calculatedTotal - Number(promoDiscount);

    if (walletAmount > finalAmount) {
      return NextResponse.json(
        { error: "Wallet exceeds order amount" },
        { status: 400 }
      );
    }

    // 💰 Wallet Check
    if (walletAmount > 0) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (!wallet || wallet.balance < walletAmount) {
        return NextResponse.json(
          { error: "Insufficient wallet balance" },
          { status: 400 }
        );
      }
    }

    // 🧾 Create Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        total_amount: calculatedTotal,
        promo_code: promoCode,
        promo_discount: promoDiscount,
        wallet_used: walletAmount,
        payment_method: paymentMethod,
        status: paymentMethod === "cod" ? "pending" : "awaiting_payment",
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Order creation failed");
    }

    // 🛒 Insert Order Items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    // 💳 Deduct Wallet
    if (walletAmount > 0) {
      const { error: walletError } = await supabase.rpc("deduct_wallet", {
        user_id_input: userId,
        amount_input: walletAmount,
      });

      if (walletError) {
        throw new Error(walletError.message);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
    });

  } catch (error: any) {
    console.error("ORDER ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Order failed" },
      { status: 500 }
    );
  }
}