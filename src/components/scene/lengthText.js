// A length in meters as shown in the 2D view (J.5.1, J.7.1, J.8.1): "3.50 m".
export const meters = (value) => `${(Math.round(value * 100) / 100).toFixed(2)} m`
