import cron from 'node-cron';
import Appointment from '../models/Appointment';
import NotificationLog from '../models/NotificationLog';
import FollowUpReminder from '../models/FollowUpReminder';
import { notificationProvider } from './notificationProvider';

export class ReminderSchedulerService {
  private cronJob: any = null;

  /**
   * Start background cron scheduler (runs every 15 minutes)
   */
  public initScheduler(): void {
    console.log('🗓️ Starting Smart Appointment Reminder Scheduler Cron...');
    
    // Run initial check on server startup
    this.runReminderChecks().catch((err) => console.error('Error running initial reminder check:', err));

    // Schedule to run every 15 minutes: '*/15 * * * *'
    this.cronJob = cron.schedule('*/15 * * * *', () => {
      console.log('⏰ Executing periodic appointment reminder check...');
      this.runReminderChecks().catch((err) => console.error('Error in reminder cron task:', err));
    });
  }

  /**
   * Main checking routine for 24h, 2h, 3d, 7d, missed, and follow-ups
   */
  public async runReminderChecks(): Promise<void> {
    const settings = await notificationProvider.getSettings();
    if (!settings.enableScheduler) return;

    const now = new Date();

    // 1. Check 24-Hour Reminders (23h to 25h ahead)
    if (settings.remindersConfig.hours24Before) {
      await this.processUpcomingReminders(now, 24 * 60, '24Hours', 'Rappel Rendez-vous (Demain)');
    }

    // 2. Check 2-Hour Reminders (1.5h to 2.5h ahead)
    if (settings.remindersConfig.hours2Before) {
      await this.processUpcomingReminders(now, 2 * 60, '2Hours', 'Rappel Rendez-vous (Dans 2h)');
    }

    // 3. Check 3-Day Reminders (71h to 73h ahead)
    if (settings.remindersConfig.days3Before) {
      await this.processUpcomingReminders(now, 3 * 24 * 60, '3Days', 'Rappel Rendez-vous (Dans 3 jours)');
    }

    // 4. Check Missed Appointments (Scheduled appointments older than 2 hours)
    if (settings.remindersConfig.missedAppointment) {
      await this.processMissedAppointments(now);
    }

    // 5. Check Clinical Follow-up Reminders due today
    if (settings.remindersConfig.followUpClinical) {
      await this.processFollowUpReminders(now);
    }
  }

  /**
   * Helper to query upcoming appointments within time window and send notifications
   */
  private async processUpcomingReminders(
    now: Date,
    targetOffsetMinutes: number,
    messageType: '7Days' | '3Days' | '24Hours' | '2Hours',
    titlePrefix: string
  ): Promise<void> {
    const windowStart = new Date(now.getTime() + (targetOffsetMinutes - 30) * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (targetOffsetMinutes + 30) * 60 * 1000);

    const appts = await Appointment.find({
      dateTime: { $gte: windowStart, $lte: windowEnd },
      status: { $in: ['Scheduled', 'Confirmed'] },
    }).populate('patientId');

    for (const appt of appts) {
      const patient: any = appt.patientId;
      if (!patient || !patient.phone) continue;

      // Check if reminder was already sent for this appointment & type
      const existingLog = await NotificationLog.findOne({
        appointmentId: appt._id,
        messageType,
      });

      if (!existingLog) {
        const apptDateStr = new Date(appt.dateTime).toLocaleDateString('fr-FR');
        const apptTimeStr = new Date(appt.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const bodyText = `Bonjour ${patient.name},\n\nRappel : Votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini est prévu le ${apptDateStr} à ${apptTimeStr}.\n\nPour confirmer ou modifier, contactez le cabinet.`;

        // Send via default channels (WhatsApp + Email if available)
        const waResult = await notificationProvider.dispatch({
          channel: 'WhatsApp',
          recipient: patient.phone,
          body: bodyText,
        });

        await NotificationLog.create({
          patientId: patient._id,
          appointmentId: appt._id,
          channel: 'WhatsApp',
          provider: waResult.provider,
          recipient: patient.phone,
          messageType,
          subject: titlePrefix,
          body: bodyText,
          status: waResult.success ? 'Sent' : 'Failed',
          errorDetails: waResult.errorDetails,
          sentAt: waResult.success ? new Date() : undefined,
        });

        // Update appointment status to 'Reminder Sent'
        if (appt.status === 'Scheduled') {
          appt.status = 'Confirmed';
          await appt.save();
        }
      }
    }
  }

  /**
   * Helper to flag missed appointments
   */
  private async processMissedAppointments(now: Date): Promise<void> {
    const pastCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours past scheduled time
    const missedAppts = await Appointment.find({
      dateTime: { $lte: pastCutoff },
      status: 'Scheduled',
    }).populate('patientId');

    for (const appt of missedAppts) {
      appt.status = 'No Show';
      await appt.save();

      const patient: any = appt.patientId;
      if (patient && patient.phone) {
        const bodyText = `Bonjour ${patient.name},\n\nNous avons constaté votre absence à votre rendez-vous aujourd'hui. Veuillez contacter le Cabinet Dr. Salma Tijini pour reprogrammer votre consultation.`;

        await notificationProvider.dispatch({
          channel: 'WhatsApp',
          recipient: patient.phone,
          body: bodyText,
        });

        await NotificationLog.create({
          patientId: patient._id,
          appointmentId: appt._id,
          channel: 'WhatsApp',
          recipient: patient.phone,
          messageType: 'Missed',
          body: bodyText,
          status: 'Sent',
        });
      }
    }
  }

  /**
   * Helper to process clinical follow-up reminders due today
   */
  private async processFollowUpReminders(now: Date): Promise<void> {
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const followUps = await FollowUpReminder.find({
      dueDate: { $lte: todayEnd },
      status: 'Pending',
    }).populate('patientId');

    for (const item of followUps) {
      const patient: any = item.patientId;
      if (patient && patient.phone) {
        const bodyText = `Bonjour ${patient.name},\n\nCabinet Dr. Salma Tijini : C'est le moment de programmer votre contrôle clinique (${item.title}). Contactez le cabinet pour votre rendez-vous.`;

        await notificationProvider.dispatch({
          channel: 'WhatsApp',
          recipient: patient.phone,
          body: bodyText,
        });

        item.status = 'Sent';
        await item.save();

        await NotificationLog.create({
          patientId: patient._id,
          channel: 'WhatsApp',
          recipient: patient.phone,
          messageType: 'FollowUp',
          body: bodyText,
          status: 'Sent',
        });
      }
    }
  }
}

export const reminderScheduler = new ReminderSchedulerService();
