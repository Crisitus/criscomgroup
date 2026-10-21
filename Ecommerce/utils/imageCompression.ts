import imageCompression from 'browser-image-compression';

/**
 * Comprime una imagen automáticamente antes de subirla al servidor
 * Esto resuelve el problema de límites de PHP (upload_max_filesize)
 *
 * @param file - Archivo de imagen original
 * @returns Archivo comprimido listo para subir
 */
export async function compressImage(file: File): Promise<File> {
  // Si no es una imagen, devolver sin comprimir
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Si ya es pequeña (<1.5MB), no comprimir
  const fileSizeInMB = file.size / 1024 / 1024;
  if (fileSizeInMB < 1.5) {
    console.log(`✓ Image is small (${fileSizeInMB.toFixed(2)}MB), skipping compression`);
    return file;
  }

  try {
    console.log(`⚙️ Compressing image: ${file.name} (${fileSizeInMB.toFixed(2)}MB)`);

    const options = {
      maxSizeMB: 1.8, // Máximo 1.8MB (debajo del límite de PHP de 2MB)
      maxWidthOrHeight: 1600, // Máximo 1600px
      useWebWorker: true, // Usar Web Worker para no bloquear UI
      fileType: 'image/jpeg', // Convertir todo a JPG
      initialQuality: 0.8, // Calidad inicial 80%
    };

    const compressedFile = await imageCompression(file, options);

    const compressedSizeInMB = compressedFile.size / 1024 / 1024;
    const savings = ((1 - compressedFile.size / file.size) * 100).toFixed(2);

    console.log(`✓ Compression complete:
      Original: ${fileSizeInMB.toFixed(2)}MB
      Compressed: ${compressedSizeInMB.toFixed(2)}MB
      Saved: ${savings}%
    `);

    // Crear nuevo File con nombre correcto
    const finalFile = new File(
      [compressedFile],
      file.name.replace(/\.\w+$/, '.jpg'), // Cambiar extensión a .jpg
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }
    );

    return finalFile;
  } catch (error) {
    console.error('⚠️ Image compression failed, using original:', error);
    return file; // Si falla, usar original
  }
}

/**
 * Comprime múltiples imágenes en paralelo
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file)));
}
