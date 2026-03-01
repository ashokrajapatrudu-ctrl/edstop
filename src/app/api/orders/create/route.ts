import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();

    // 🔐 Get logged-in user from session (DO NOT trust frontend)
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookies().getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();

    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      cartItems,
      totalAmount,
      restaurantId,
      paymentMethod,
      walletAmount = 0,
      promoCode = null,
      promoDiscount = 0,
    } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID missing" },
        { status: 400 }
      );
    }

    // 🔎 Recalculate total safely
    const calculatedTotal = cartItems.reduce(
      (sum: number, item: any) =>
        sum +
        Number(item.price || 0) * Number(item.quantity || 0),
      0
    );

    // Allow small floating difference
    if (Math.abs(calculatedTotal - Number(totalAmount)) > 1) {
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

    // 💰 Wallet validation
    if (walletAmount > 0) {
      const { data: wallet } = await supabaseAdmin
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
    const { data: order, error: orderError } = await supabaseAdmin
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

    // 🛒 Insert order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    // 💳 Deduct wallet
    if (walletAmount > 0) {
      const { error: walletError } =
        await supabaseAdmin.rpc("deduct_wallet", {
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