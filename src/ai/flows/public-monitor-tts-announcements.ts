
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import wav from 'wav';

const PublicMonitorTTSAnnouncementsInputSchema = z.object({
  ticketNumber: z.string().describe('The ticket number being called.'),
  departmentName: z.string().describe('The name of the department.'),
  serviceType: z.string().describe('The type of service.'),
  counterNumber: z.number().describe('The counter number.'),
});
export type PublicMonitorTTSAnnouncementsInput = z.infer<typeof PublicMonitorTTSAnnouncementsInputSchema>;

const PublicMonitorTTSAnnouncementsOutputSchema = z.object({
  media: z.string().describe("The base64 encoded WAV audio data URI."),
});
export type PublicMonitorTTSAnnouncementsOutput = z.infer<typeof PublicMonitorTTSAnnouncementsOutputSchema>;

export async function announceTicket(input: PublicMonitorTTSAnnouncementsInput): Promise<PublicMonitorTTSAnnouncementsOutput> {
  return publicMonitorTTSAnnouncementsFlow(input);
}

const publicMonitorTTSAnnouncementsFlow = ai.defineFlow(
  {
    name: 'publicMonitorTTSAnnouncementsFlow',
    inputSchema: PublicMonitorTTSAnnouncementsInputSchema,
    outputSchema: PublicMonitorTTSAnnouncementsOutputSchema,
  },
  async input => {
    const {ticketNumber, counterNumber} = input;
    // Normalized announcement string for speed and clarity
    const announcementText = `Number ${ticketNumber}, Counter ${counterNumber}.`;

    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: `Speak at a normal, conversational speed: ${announcementText}`,
    });

    if (!media) throw new Error('No audio returned.');

    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    const wavBase64 = await toWav(audioBuffer);

    return { media: 'data:audio/wav;base64,' + wavBase64 };
  }
);

async function toWav(pcmData: Buffer, channels = 1, rate = 24000, sampleWidth = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({ channels, sampleRate: rate, bitDepth: sampleWidth * 8 });
    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', d => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
    writer.write(pcmData);
    writer.end();
  });
}
