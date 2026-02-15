import styles from '@/styles/hero.module.css';
import ImageSlider from '@/components/ImageSlider/ImageSlider';
function Hero(){

  return(
    // <!-- Hero Section -->
    <section id="hero" className={styles.hero} style={{scrollMarginTop: '80px'}}>
        <ImageSlider />
    </section>
  );
}

export default Hero
