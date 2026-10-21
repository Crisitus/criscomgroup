"use client"

// Home publica (port criscom-ecom-home): 8 secciones aprobadas en orden fijo.
// El chrome (navbar + footer) vive en app/(public)/layout.tsx.
import HeroCarousel from "@/components/home/HeroCarousel"
import CategoriesSection from "@/components/home/CategoriesSection"
import OffersSection from "@/components/home/OffersSection"
import NeedSection from "@/components/home/NeedSection"
import MarketingStrip from "@/components/home/MarketingStrip"
import BlogSection from "@/components/home/BlogSection"
import CommunitySection from "@/components/home/CommunitySection"
import "@/styles/home.css"

const HomePage = () => (
  <div className="pg-home">
    <HeroCarousel />
    <CategoriesSection />
    <OffersSection />
    <NeedSection />
    <MarketingStrip />
    <BlogSection />
    <CommunitySection />
  </div>
)

export default HomePage
