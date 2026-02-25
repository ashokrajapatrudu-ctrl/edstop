import type { Metadata } from 'next';
import FoodOrderingInteractive from './components/FoodOrderingInteractive';

export const metadata: Metadata = {
  title: 'Food Ordering - EdStop',
  description: 'Order delicious food from campus restaurants with EdCoins cashback and convenient delivery to your doorstep at IIT Kharagpur.',
};

export default function FoodOrderingPage() {
  return <FoodOrderingInteractive />;
}