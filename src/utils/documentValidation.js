export function validarCedulaUruguaya(cedula) {
    let ci = cedula.replace(/\D/g, ''); 
    if (ci.length < 7 || ci.length > 8) return false;
    
    if (ci.length === 7) ci = '0' + ci;

    const digitoIngresado = parseInt(ci[7], 10);
    const multiplicadores = [2, 9, 8, 7, 6, 3, 4];
    let suma = 0;

    for (let i = 0; i < 7; i++) {
        suma += parseInt(ci[i], 10) * multiplicadores[i];
    }

    const resto = suma % 10;
    const digitoCalculado = resto === 0 ? 0 : 10 - resto;

    return digitoIngresado === digitoCalculado;
}

export function validarRUTUruguayo(rut) {
    const r = rut.replace(/\D/g, '');
    if (r.length !== 12) return false;
    
    // En Uruguay los RUT siempre empiezan con números entre 01 y 21, y las posiciones 9 a 11 suelen ser 001.
    // Verificamos al menos que los dos primeros dígitos no sean 00
    if (r.substring(0, 2) === '00') return false;

    let suma = 0;
    const multiplicadores = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    for (let i = 0; i < 11; i++) {
        suma += parseInt(r[i], 10) * multiplicadores[i];
    }

    const resto = suma % 11;
    let digitoCalculado = 11 - resto;
    if (digitoCalculado === 11) digitoCalculado = 0;
    if (digitoCalculado === 10) return false; // En RUT uruguayo no existe digito verificador 10 válido generado

    const digitoIngresado = parseInt(r[11], 10);
    return digitoCalculado === digitoIngresado;
}

export function validateClientDocument(doc) {
    if (!doc) return false;
    const cleanDoc = doc.replace(/\D/g, '');
    
    if (cleanDoc.length === 12) {
        return validarRUTUruguayo(cleanDoc);
    } else if (cleanDoc.length === 7 || cleanDoc.length === 8) {
        return validarCedulaUruguaya(cleanDoc);
    }
    return false; // Si no tiene 7, 8 o 12 digitos es invalido directamente
}
