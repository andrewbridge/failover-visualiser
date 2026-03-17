const toString36 = (num) => num.toString(36).substring(2);

export const getUid = () => toString36(Math.random()) + toString36(Date.now());

export const toTitleCase = (str) => str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');