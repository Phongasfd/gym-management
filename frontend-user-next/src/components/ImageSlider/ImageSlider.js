"use client";

import { useState } from 'react';
import Image from "next/image";
import styles from "@/styles/slider.module.css";

const images = [
  "/images/image-1.jpg",
  "/images/image-2.jpg",
  "/images/image-3.jpg"
];

export default function ImageSlider() {
  const [current, setCurrent] = useState(0);

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={styles.slider}>
      <button className={styles.prev} onClick={prevSlide}>
        ❮
      </button>

      <div className={styles.imageContainer}>
        <Image
          src={images[current]}
          alt="slider image"
          fill
          className={styles.image}
        />
      </div>

      <button className={styles.next} onClick={nextSlide}>
        ❯
      </button>
    </div>
  );
}
