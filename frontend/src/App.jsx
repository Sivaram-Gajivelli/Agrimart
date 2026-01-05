import { useState } from 'react'
import './assets/styles/App.css'
import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import Home from './app/Home'
import About from './app/About'

function App() {
  return (
    <>
      <Navbar/>

      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/about' element={<About/>}></Route>
      </Routes>
    </>
  )
}

export default App
