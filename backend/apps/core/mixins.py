class OwnedQuerysetMixin:
    """Restrict a ViewSet to the requesting user's rows and stamp new rows with them.

    Every domain model has a ``user`` FK; scoping here means an object that
    belongs to someone else is simply not found (404), never leaked (403).
    """

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
