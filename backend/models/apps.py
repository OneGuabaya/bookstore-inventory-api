from django.apps import AppConfig


class ModelsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'models'
    label = 'domain_models'

    def ready(self):
        import models.api_log  # noqa: F401
        import models.book     # noqa: F401
        import models.rate     # noqa: F401