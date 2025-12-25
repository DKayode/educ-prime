export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques
        .replace(/\s+/g, '-') // remplace les espaces par des tirets
        .replace(/[^\w\-]+/g, '') // supprime les caractères non alphanumériques
        .replace(/\-\-+/g, '-') // remplace les tirets multiples par un seul
        .replace(/^-+/, '') // supprime les tirets au début
        .replace(/-+$/, ''); // supprime les tirets à la fin
}