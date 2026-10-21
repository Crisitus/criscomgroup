export const features = {
  ecommerce: import.meta.env.VITE_FEATURE_ECOMMERCE === 'true',
  marketing: import.meta.env.VITE_FEATURE_MARKETING === 'true',
  libroReclamaciones: import.meta.env.VITE_FEATURE_LIBRO_RECLAMACIONES === 'true',
};
