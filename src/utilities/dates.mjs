import { parse, format } from "../deps/date-fns.mjs";

const getZeroedDate = () => new Date(0,0,0,0,0,0,0);

/** @type {(dateString: string) => Date} */
export const fromDateString = (dateString) => parse(dateString.slice(0,10), 'yyyy-MM-dd', getZeroedDate());

const dateFormat = 'EEE MMM do';
const fullDateFormat = dateFormat + ' yyyy';
/** @type {(date: Date) => string} */
export const formatDate = (date, year = true) => format(date, year ? fullDateFormat : dateFormat);

/** @type {(date: Date) => string} */
export const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** @type {(date: Date) => string} */
export const formatDateTime = (date, year = true) => formatDate(date, year) + ' ' + formatTime(date);

/** @type {(dateString: string) => Date} */
export const fromFormattedDateString = (dateString) => parse(dateString, dateFormat, getZeroedDate());