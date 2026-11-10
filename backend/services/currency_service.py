import datetime
from decimal import Decimal
from typing import Dict, Any, Tuple
import requests
from django.utils import timezone
from models.rate import RateLog

DEFAULT_FALLBACK_RATES: Dict[str, float] = {
    "USD": 1.0,
    "EUR": 0.89,
    "VES": 899.27,
    "COP": 3240.00,
    "ARS": 1540.00,
    "BRL": 5.50,
    "MXN": 18.50,
}

COUNTRY_TO_CURRENCY: Dict[str, str] = {
    "ES": "EUR",
    "US": "USD",
    "VE": "VES",
    "CO": "COP",
    "AR": "ARS",
    "BR": "BRL",
    "MX": "MXN",
    "GB": "GBP",
    "FR": "EUR",
    "DE": "EUR",
    "IT": "EUR",
    "PT": "EUR",
    "CL": "CLP",
    "PE": "PEN",
}

class CurrencyService:
    API_URL = "https://api.exchangerate-api.com/v4/latest/USD"
    TIMEOUT_SECONDS = 5

    @classmethod
    def get_currency_for_country(cls, country_code: str) -> str:
        return COUNTRY_TO_CURRENCY.get(country_code.upper(), "EUR")

    @classmethod
    def fetch_and_save_rates(cls) -> Tuple[Dict[str, Any], bool]:
        try:
            response = requests.get(cls.API_URL, timeout=cls.TIMEOUT_SECONDS)
            if response.status_code == 200:
                payload = response.json()
                new_rates = payload.get("rates", {})
                api_date_str = payload.get("date", timezone.now().strftime("%Y-%m-%d"))
                time_last_updated = payload.get("time_last_updated", int(timezone.now().timestamp()))

                try:
                    api_date = datetime.datetime.strptime(api_date_str, "%Y-%m-%d").date()
                except ValueError:
                    api_date = timezone.now().date()

                latest_today_log = RateLog.objects.filter(api_date=api_date).order_by("-fetched_at").first()

                if latest_today_log and latest_today_log.rates == new_rates:
                    return latest_today_log.rates, False

                RateLog.objects.create(
                    provider=payload.get("provider", "https://www.exchangerate-api.com"),
                    base_currency=payload.get("base", "USD"),
                    api_date=api_date,
                    time_last_updated=time_last_updated,
                    rates=new_rates,
                )
                return new_rates, False

        except Exception:
            pass

        latest_log = RateLog.objects.order_by("-fetched_at").first()
        if latest_log and latest_log.rates:
            return latest_log.rates, True

        return DEFAULT_FALLBACK_RATES, True

    @classmethod
    def get_rate(cls, target_currency: str) -> Tuple[Decimal, bool]:
        currency = target_currency.upper()
        rates, is_fallback = cls.fetch_and_save_rates()
        rate_val = rates.get(currency)

        if rate_val is None:
            rate_val = DEFAULT_FALLBACK_RATES.get(currency, 1.0)
            is_fallback = True

        return Decimal(str(rate_val)), is_fallback