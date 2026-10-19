import { auth } from "@clerk/nextjs/server";
import HomeView from "@/modules/home/components/home-view";
import AppHome from "@/modules/app/components/app-home";

export default async function Home({ searchParams }) {
  const { userId } = await auth();
  if (!userId) return <HomeView />;

  const { project } = await searchParams;
  return <AppHome projectId={typeof project === "string" ? project : null} />;
}
