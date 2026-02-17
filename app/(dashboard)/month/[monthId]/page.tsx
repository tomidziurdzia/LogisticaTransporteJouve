import { MonthView } from "@/components/periods/month-view";

interface MonthPageProps {
  params: Promise<{ monthId: string }>;
}

export default async function MonthPage({ params }: MonthPageProps) {
  const { monthId } = await params;
  return <MonthView monthId={monthId} />;
}
