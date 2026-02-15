import Image from "next/image";
import Header from "@/components/Header/Header";
import Hero from "@/components/hero/page";
import Features from "@/components/Features/Features";
import Programs from "@/components/Programs/Programs";
import Pricing from "@/components/Pricing/Pricing";
import Testimonials from "@/components/testimonials/page";
import Footer from "@/components/Footer/Footer";

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
