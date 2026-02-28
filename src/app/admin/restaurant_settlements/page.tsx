'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RestaurantSettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('restaurant_settlements')
        .select(`
          *,
          restaurants ( name )
        `)
        .order('paid_at', { ascending: false });

      if (!error) {
        setSettlements(data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">
        Restaurant Settlement History
      </h1>
       <Link
  href="/admin/restaurant-settlements"
  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm"
>
  View Restaurant Settlement History
</Link>
      {loading ? (
        <p>Loading...</p>
      ) : settlements.length === 0 ? (
        <p>No settlements yet.</p>
      ) : (
        <div className="bg-white shadow rounded-xl p-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Restaurant</th>
                <th className="py-2">Week</th>
                <th className="py-2">Amount Paid</th>
                <th className="py-2">Paid At</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{s.restaurants?.name}</td>
                  <td className="py-2">
                    {new Date(s.week_start).toLocaleDateString()}
                  </td>
                  <td className="py-2 font-semibold text-green-600">
                    ₹{s.amount_paid}
                  </td>
                  <td className="py-2">
                    {new Date(s.paid_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}