import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";


export default function Home() {
  return (
    <div className="p-4 text-2xl flex justify-center ">
     <Button> Text</Button>
     <UserButton />
    </div>
  );
}
