import ChatsPage from "@/modules/chats/components/chats-page";

export const metadata = { title: "Chats" };

export default async function Page({ searchParams }) {
  const { scope } = await searchParams;
  return <ChatsPage key={scope ?? "all"} initialScope={typeof scope === "string" ? scope : "all"} />;
}
