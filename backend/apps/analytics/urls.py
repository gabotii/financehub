from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.SummaryView.as_view(), name="analytics-summary"),
    path("by-category/", views.CategoryBreakdownView.as_view(), name="analytics-by-category"),
    path("monthly/", views.MonthlyTrendView.as_view(), name="analytics-monthly"),
]
