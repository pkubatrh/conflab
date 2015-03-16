from django.contrib import admin
from confla.models import *
# Register your models here.

class EventAdmin(admin.ModelAdmin):
    list_display = ('id', 'topic')
    #list_filter = ['event_start']

class RoomAdmin(admin.ModelAdmin):
    #ordering = ('id', 's_name')
    list_display = ('id', 'shortname')

class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'name')

class PaperAdmin(admin.ModelAdmin):
    list_display = ('title', 'user')

class ConfAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_Current')

class TimeslotAdmin(admin.ModelAdmin):
    list_display = ('id', 'start_time', 'end_time')

admin.site.register(Room, RoomAdmin)
admin.site.register(ConflaUser, UserAdmin)
admin.site.register(EventType)
admin.site.register(Event, EventAdmin)
admin.site.register(Paper, PaperAdmin)
admin.site.register(Conference, ConfAdmin)
admin.site.register(EmailAdress)
admin.site.register(EventTag)
admin.site.register(Volunteer)
admin.site.register(VolunteerBlock)
admin.site.register(Timeslot, TimeslotAdmin)
