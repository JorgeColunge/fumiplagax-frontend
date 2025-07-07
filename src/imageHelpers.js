import imageCompression from 'browser-image-compression';

/**
 * Comprime y redimensiona una imagen manteniendo el formato JPEG.
 *
 * @param {File|Blob} file            Archivo original del <input type="file">
 * @param {Object}    [opts]          Opciones opcionales
 * @param {number}    [opts.maxMB=1]  Peso máximo objetivo en MB
 * @param {number}    [opts.maxWH=1280] Tamaño máximo (ancho o alto) en px
 * @param {number}    [opts.quality=0.7] Calidad inicial (0-1)
 *
 * @returns {Promise<Blob>}           Blob comprimido
 */
export async function compressImage(
    file,
    { maxMB = 0.3, maxWH = 600, quality = 0.7 } = {},
) {
    const options = {
        maxSizeMB: maxMB,
        maxWidthOrHeight: maxWH,
        initialQuality: quality,
        useWebWorker: true,
        fileType: 'image/jpeg',
    };
    return imageCompression(file, options);
}
