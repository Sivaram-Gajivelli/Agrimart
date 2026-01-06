import React from 'react'
import HeroSection from '../components/Herosection'
import LivePrices from '../components/LivePrices'
import ProductsSection from '../components/ProductsSection'
import Footer from '../components/Footer'

const Home = () => {
  return (
    <>
        <HeroSection/>
        <LivePrices/>
        <ProductsSection/>
        <Footer/>
    </>
  )
}

export default Home