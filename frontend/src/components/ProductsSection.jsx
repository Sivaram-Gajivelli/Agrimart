import React from "react";
import ProductCard from "./ProductCard";
import "../assets/styles/Products.css";
import tomatoes from "../assets/images/produce/tomatoes.png"
import potatoes from "../assets/images/produce/potatoes.png"

const ProductsSection = ({ activeFilter = 'All' }) => {
  const categories = {
    'Fresh vegetables': [
      {
        name: "Tomato",
        price: 25,
        unit: "kg",
        producer: "Farmer",
        location: "Guntur, AP",
        image: tomatoes
      },
      {
        name: "Potato",
        price: 30,
        unit: "kg",
        producer: "Farmer",
        location: "Nashik, MH",
        image: potatoes
      }
    ],

    'Fresh fruits': [
      {
        name: "Banana",
        price: 40,
        unit: "dozen",
        producer: "Farmer",
        location: "Tirupati, AP",
        image: "https://placehold.co/200x200/e8f5e9/2f7d32?text=Banana"
      }
    ],

    'Atta, rice & grains': [
      {
        name: "Rice",
        price: 55,
        unit: "kg",
        producer: "Farmer",
        location: "West Godavari, AP",
        image: "https://placehold.co/200x200/e8f5e9/2f7d32?text=Rice"
      }
    ],

    'Dals & pulses': [
      {
        name: "Farm Eggs",
        price: 6,
        unit: "piece",
        producer: "Poultry Farmer",
        location: "Vijayawada, AP",
        image: "https://placehold.co/200x200/e8f5e9/2f7d32?text=Eggs"
      },
      {
        name: "Fresh Milk",
        price: 55,
        unit: "litre",
        producer: "Dairy Farmer",
        location: "Krishna, AP",
        image: "https://placehold.co/200x200/e8f5e9/2f7d32?text=Milk"
      }
    ]
  };

  return (
    <section className="products-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>{activeFilter === 'All' ? 'Featured Products' : `${activeFilter}`}</h2>
        <span style={{ color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}>See All &gt;</span>
      </div>

      {Object.entries(categories)
        .filter(([category]) => activeFilter === 'All' || category === activeFilter)
        .map(([category, items]) => (
          <div key={category} className="category-block">

            <div className="product-grid">
              {items.map((product, index) => (
                <ProductCard key={index} product={product} />
              ))}
            </div>
          </div>
        ))}
    </section>
  );
};

export default ProductsSection;
