import dynamic from "next/dynamic";
const HorizontalJourneyWireframe = dynamic(
  () => import("@/components/HorizontalJourneyWireframe"),
  { ssr: false } // để framer-motion mượt trên client
);

export default function Page() {
  return <HorizontalJourneyWireframe />;
}
