import React from "react";
import ProductCard from "./ProductCard";
import "../assets/styles/Products.css";
import tomatoes from "../assets/images/produce/tomatoes.png"
import potatoes from "../assets/images/produce/potatoes.png"

const ProductsSection = () => {
  const categories = {
    Vegetables: [
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

    Fruits: [
      {
        name: "Banana",
        price: 40,
        unit: "dozen",
        producer: "Farmer",
        location: "Tirupati, AP",
        image: "https://placehold.co/200x200/e8f5e9/2f7d32?text=Banana"
      }
    ],

    Grains: [
      {
        name: "Rice",
        price: 55,
        unit: "kg",
        producer: "Farmer",
        location: "West Godavari, AP",
        image: "https://placehold.co/200x200/e8f5e9/2f7d32?text=Rice"
      }
    ],

    "Livestock Essentials": [
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
      <h2>Featured Products</h2>

      {Object.entries(categories).map(([category, items]) => (
        <div key={category} className="category-block">
          <h3>{category}</h3>

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
