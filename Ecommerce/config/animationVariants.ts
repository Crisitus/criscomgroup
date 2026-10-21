import { Variants } from "framer-motion"

/**
 * Variantes globales de animación para Framer Motion
 * Diseñadas para un estilo sutil y elegante tipo Apple/Tesla
 * Reutilizables en todos los componentes
 */

// ============================================
// FADE & SLIDE ANIMATIONS
// ============================================

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

// ============================================
// STAGGER CONTAINERS
// ============================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
}

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  }
}

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2
    }
  }
}

// ============================================
// HOVER EFFECTS
// ============================================

export const scaleOnHover: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: 0.3, ease: "easeOut" }
  }
}

export const cardLift: Variants = {
  rest: {
    y: 0,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  hover: {
    y: -8,
    boxShadow: "0 20px 25px rgba(0,0,0,0.15)",
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  }
}

export const glowOnHover: Variants = {
  rest: {
    filter: "brightness(1)",
    boxShadow: "0 0 0 rgba(201, 169, 97, 0)"
  },
  hover: {
    filter: "brightness(1.1)",
    boxShadow: "0 0 20px rgba(201, 169, 97, 0.3)",
    transition: { duration: 0.3 }
  }
}

// ============================================
// BUTTON VARIANTS
// ============================================

export const magneticButton: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
}

export const buttonVariants: Variants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.05,
    y: -2,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: { scale: 0.95, y: 0 }
}

// ============================================
// CHECKBOX ANIMATIONS
// ============================================

export const checkboxVariants: Variants = {
  unchecked: {
    scale: 0,
    opacity: 0
  },
  checked: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20
    }
  }
}

export const checkboxBorderVariants: Variants = {
  unchecked: {
    borderColor: "rgb(209, 213, 219)" // gray-300
  },
  checked: {
    borderColor: "var(--primary)",
    transition: { duration: 0.2 }
  }
}

// ============================================
// ICON ANIMATIONS
// ============================================

export const iconFloat: Variants = {
  rest: { y: 0 },
  hover: {
    y: [-10, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  }
}

export const iconRotate: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: {
    rotate: [0, -10, 10, -10, 0],
    scale: 1.1,
    transition: { duration: 0.5 }
  }
}

export const iconSpin: Variants = {
  rest: { rotate: 0 },
  hover: {
    rotate: 360,
    transition: { duration: 0.6, ease: "easeInOut" }
  }
}

// ============================================
// SCALE ANIMATIONS
// ============================================

export const scaleIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  }
}

export const scaleInCenter: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  }
}

// ============================================
// SLIDE ANIMATIONS (para carousels)
// ============================================

export const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 100, damping: 20 },
      opacity: { duration: 0.5 }
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    transition: { duration: 0.5 }
  })
}

// ============================================
// TEXT ANIMATIONS
// ============================================

export const textReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  })
}

// ============================================
// MODAL/OVERLAY ANIMATIONS
// ============================================

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2 }
  }
}

// ============================================
// DRAWER ANIMATIONS
// ============================================

export const drawerLeft: Variants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  exit: {
    x: "-100%",
    transition: { duration: 0.2 }
  }
}

export const drawerRight: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  exit: {
    x: "100%",
    transition: { duration: 0.2 }
  }
}

// ============================================
// NOTIFICATION ANIMATIONS
// ============================================

export const notificationSlide: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

// ============================================
// EASING CURVES (custom)
// ============================================

export const easings = {
  // Apple-style easing
  apple: [0.22, 1, 0.36, 1],
  // Material Design easing
  material: [0.4, 0, 0.2, 1],
  // Smooth entrance
  smoothIn: [0.25, 0.46, 0.45, 0.94],
  // Smooth exit
  smoothOut: [0.55, 0.085, 0.68, 0.53],
  // Bounce
  bounce: [0.68, -0.55, 0.265, 1.55]
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Genera un delay progresivo para listas
 * @param index - Índice del elemento
 * @param baseDelay - Delay base en segundos
 */
export const generateStaggerDelay = (index: number, baseDelay: number = 0.1) => {
  return {
    transition: { delay: index * baseDelay }
  }
}

/**
 * Combina múltiples variants
 */
export const combineVariants = (...variants: Variants[]): Variants => {
  return variants.reduce((acc, variant) => ({ ...acc, ...variant }), {})
}
