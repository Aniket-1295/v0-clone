import ProjectsForm from "@/modules/home/components/ProjectsForm";
import ProjectList from "@/modules/home/components/project-list";
import HeroSection from "@/modules/home/components/HeroSection";


export default function Home() {
  return (
    <>
      <HeroSection />
      <div className="flex items-center justify-center w-full px-4 py-8">
        <div className="max-w-5xl w-full">
          <section className="space-y-8 flex flex-col items-center">
            <div className="max-w-3xl w-full">
              <ProjectsForm />
            </div>
            <ProjectList />
          </section>
        </div>
      </div>
    </>
  );
}
