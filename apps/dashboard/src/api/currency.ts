import { api as http } from './client';

export interface CurrencyRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
}

export interface SupportedCurrency {
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
}

export interface ConvertResult {
  result: number;
}

export const currencyApi = {
  getRates: () =>
    http.get<CurrencyRate[]>('/currency/rates').then((r) => r.data),
  updateRates: (rates: Array<{ from: string; to: string; rate: number }>) =>
    http.post<CurrencyRate[]>('/currency/rates', { rates }).then((r) => r.data),
  convert: (amount: number, from: string, to: string) =>
    http.post<number>('/currency/convert', { amount, from, to }).then((r) => r.data),
  getSupportedCurrencies: () =>
    http.get<SupportedCurrency[]>('/currency/supported').then((r) => r.data),
};
