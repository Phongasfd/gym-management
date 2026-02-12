import styles from '@/styles/footer.module.css';

function Footer(){

  return(
    // <!-- Footer -->
    <footer className={styles.footer}>
        <div className="container">
            <div className={styles["footer-content"]}>
                <div className={styles["footer-brand"]}>
                    <a href="#" className={styles.logo}>
                        <span className={styles["logo-icon"]}>💪</span>
                        <span className={styles["logo-text"]}>ELEVATE</span>
                    </a>
                    <p className={styles["footer-description"]}>The future of fitness is intelligent, adaptive, and accessible to everyone.</p>
                    <div className={styles["social-links"]}>
                        <a href="#" className={styles["social-link"]}><i className="fab fa-twitter"></i></a>
                        <a href="#" className={styles["social-link"]}><i className="fab fa-instagram"></i></a>
                        <a href="#" className={styles["social-link"]}><i className="fab fa-facebook-f"></i></a>
                        <a href="#" className={styles["social-link"]}><i className="fab fa-youtube"></i></a>
                    </div>
                </div>
                <div className={styles["footer-links"]}>
                    <div className={styles["footer-column"]}>
                        <h4 className={styles["footer-title"]}>Platform</h4>
                        <ul>
                            <li><a href="#">Features</a></li>
                            <li><a href="#">Pricing</a></li>
                            <li><a href="#">Case Studies</a></li>
                            <li><a href="#">Updates</a></li>
                        </ul>
                    </div>
                    <div className={styles["footer-column"]}>
                        <h4 className={styles["footer-title"]}>Company</h4>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Press</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>
                    <div className={styles["footer-column"]}>
                        <h4 className={styles["footer-title"]}>Resources</h4>
                        <ul>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Help Center</a></li>
                            <li><a href="#">Community</a></li>
                            <li><a href="#">Partners</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className={styles["footer-bottom"]}>
                <p className={styles.copyright}>© 2023 Elevate Fitness. All rights reserved.</p>
                <div className={styles["footer-legal"]}>
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                    <a href="#">Cookie Policy</a>
                </div>
            </div>
        </div>
    </footer>
  );
}

export default Footer