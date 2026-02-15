import Image from "next/image";
import Header from "@/components/header/page";
import Hero from "@/components/hero/page";
import Features from "@/components/features/page";
import Programs from "@/components/programs/page";
import Pricing from "@/components/pricing/page";
import Testimonials from "@/components/testimonials/page";
import Footer from "@/components/footer/page";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <Features />
      <Programs />
      <Pricing />
      <Testimonials />
      <Footer />
    </>
  );
}
