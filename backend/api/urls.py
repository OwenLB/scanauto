from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health, name='health'),
    path('analyze/', views.analyze, name='analyze'),
    path('scrape/', views.scrape_prefill, name='scrape_prefill'),
    path('analyses/create/', views.analysis_create, name='analysis_create'),
    path('analyses/', views.analyses_list, name='analyses_list'),
    path('analyses/<str:analysis_id>/', views.analysis_detail, name='analysis_detail'),
    path('groups/', views.groups_list, name='groups_list'),
    path('groups/<str:group_id>/', views.group_detail, name='group_detail'),
    path('vendor-response/', views.vendor_response, name='vendor_response'),
    path('user/api-key/', views.user_api_key, name='user_api_key'),
    path('user/settings/', views.user_settings, name='user_settings'),
    path('analyses/<str:analysis_id>/share/', views.analysis_share, name='analysis_share'),
    path('public/analyses/<str:analysis_id>/', views.analysis_public, name='analysis_public'),
    path('chat/', views.chat, name='chat'),
    path('chat/dashboard/', views.chat_dashboard, name='chat_dashboard'),
    path('chat/<str:analysis_id>/', views.chat_history, name='chat_history'),
]
