import styles from '@/styles/header.module.css';

function Header(){

  return(
    <header className={styles.header}>
          <div className="container">
              <nav className={styles.navbar}>
                  <a href="#" className={styles.logo}>
                      <span className={styles["logo-icon"]}>💪</span>
                      <span className={styles["logo-text"]}>ELEVATE</span>
                  </a>
                  
                  <input type="checkbox" id="menu-toggle" className={styles["menu-toggle"]} />
                  <label htmlFor="menu-toggle" className={styles["menu-button"]}>
                      <span className={styles["menu-line"]}></span>
                      <span className={styles["menu-line"]}></span>
                      <span className={styles["menu-line"]}></span>
                  </label>
                  
                  <ul className={styles["nav-links"]}>
                      <li><a href="#" className={`${styles["nav-link"]} ${styles.active}`}>Home</a></li>
                      <li><a href="#" className={styles["nav-link"]}>Programs</a></li>
                      <li><a href="#" className={styles["nav-link"]}>Pricing</a></li>
                      <li><a href="#" className={styles["nav-link"]}>About</a></li>
                      <li><a href="#" className={styles["nav-link"]}>Contact</a></li>
                      <li><a href="/login" className={`${styles["nav-link"]} ${styles["cta-nav"]}`}
                        >Login <i className="fas fa-arrow-right"></i></a></li>
                  </ul>
              </nav>
          </div>
      </header>
  );
}

export default Header