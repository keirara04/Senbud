import { Redirect } from 'expo-router';

// The tab bar's centre slot is BudTab, which opens /assistant. A deep link to /bud lands on Home.
export default function BudSlot() {
  return <Redirect href="/" />;
}
