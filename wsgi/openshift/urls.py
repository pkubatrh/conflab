from django.conf.urls import include, url

from django.contrib import admin

from django.conf import settings

admin.autodiscover()

urlpatterns = [
    # Examples:)
    url(r'^', include('confla.urls', namespace='confla')),
    # url(r'^$', 'openshift.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^admin/', include(admin.site.urls)),
]
