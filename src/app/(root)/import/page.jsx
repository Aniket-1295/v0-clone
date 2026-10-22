import ImportPage from "@/modules/import/components/import-page";

export const metadata = { title: "Import from GitHub", robots: { index: false } };

export default async function Page({ searchParams }) {
  const { github } = await searchParams;
  return <ImportPage githubNotice={github ?? null} />;
}
