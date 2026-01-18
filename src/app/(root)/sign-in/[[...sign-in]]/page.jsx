import React from "react";
import { SignIn } from "@clerk/nextjs";

const SigninPage = () => {
  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full">
      <section className="space-y-6 pt-[16vh] 2xl:pt-48">
        <SignIn />
      </section>
    </div>
  );
};

export default SigninPage;
