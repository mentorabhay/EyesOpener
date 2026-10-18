import { Waiting } from "@/components/shell/waiting";

/** While a page of this area is on its way: the frame stays and the page's place is held (audit U2). */
export default function Loading() {
  return <Waiting />;
}
