from rest_framework import serializers


class OwnedPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """A PK field that only accepts objects owned by the requesting user.

    Someone else's id is rejected as "does not exist", so ids can't be probed.
    """

    def get_queryset(self):
        request = self.context.get("request")
        queryset = super().get_queryset()
        if request is None or not request.user.is_authenticated:
            return queryset.none()
        return queryset.filter(user=request.user)
