import InviteAcceptPage from "@/modules/teams/components/invite-accept-page";

export const metadata = { title: "Team invite", robots: { index: false } };

export default async function Page({ params }) {
  const { token } = await params;
  return <InviteAcceptPage token={token} />;
}
