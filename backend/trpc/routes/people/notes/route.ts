// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/people/notes/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/server";
import { PeopleRepo } from "@/repos/PeopleRepo";
import { VoiceNotesRepo } from "@/repos/VoiceNotesRepo";
import { Person, VoiceNote } from "@/storage/types";

// Add a note to a person
export const addNoteProcedure = publicProcedure
  .input(z.object({
    personId: z.string(),
    note: z.string(),
    category: z.enum(['general', 'interaction', 'interest', 'goal', 'personal']).default('general')
  }))
  .mutation(async ({ input }) => {
    try {
      const person = await PeopleRepo.get(input.personId);
      if (!person) {
        throw new Error('Person not found');
      }

      const newInteraction = {
        id: Date.now().toString(),
        channel: 'note' as const,
        occurredAt: new Date().toISOString(),
        summary: input.note,
        sentiment: 'neu' as const
      };

      const updatedPerson: Person = {
        ...person,
        interactions: [...(person.interactions || []), newInteraction],
        lastInteraction: new Date().toISOString(),
        lastInteractionSummary: input.note
      };

      await PeopleRepo.upsert(updatedPerson);
      
      return {
        success: true,
        person: updatedPerson,
        noteId: newInteraction.id
      };
    } catch (error: any) {
      console.error('Add note error:', error);
      throw new Error(`Failed to add note: ${error.message}`);
    }
  });

// Update person's interests
export const updateInterestsProcedure = publicProcedure
  .input(z.object({
    personId: z.string(),
    interests: z.array(z.string()),
    action: z.enum(['add', 'remove', 'replace']).default('add')
  }))
  .mutation(async ({ input }) => {
    try {
      const person = await PeopleRepo.get(input.personId);
      if (!person) {
        throw new Error('Person not found');
      }

      let updatedInterests = person.interests || [];
      
      switch (input.action) {
        case 'add':
          updatedInterests = [...new Set([...updatedInterests, ...input.interests])];
          break;
        case 'remove':
          updatedInterests = updatedInterests.filter(interest => !input.interests.includes(interest));
          break;
        case 'replace':
          updatedInterests = input.interests;
          break;
      }

      const updatedPerson: Person = {
        ...person,
        interests: updatedInterests
      };

      await PeopleRepo.upsert(updatedPerson);
      
      return {
        success: true,
        person: updatedPerson
      };
    } catch (error: any) {
      console.error('Update interests error:', error);
      throw new Error(`Failed to update interests: ${error.message}`);
    }
  });

// Update person's goals
export const updateGoalsProcedure = publicProcedure
  .input(z.object({
    personId: z.string(),
    goals: z.array(z.string()),
    action: z.enum(['add', 'remove', 'replace']).default('add')
  }))
  .mutation(async ({ input }) => {
    try {
      const person = await PeopleRepo.get(input.personId);
      if (!person) {
        throw new Error('Person not found');
      }

      let updatedGoals = person.goals || [];
      
      switch (input.action) {
        case 'add':
          updatedGoals = [...new Set([...updatedGoals, ...input.goals])];
          break;
        case 'remove':
          updatedGoals = updatedGoals.filter(goal => !input.goals.includes(goal));
          break;
        case 'replace':
          updatedGoals = input.goals;
          break;
      }

      const updatedPerson: Person = {
        ...person,
        goals: updatedGoals
      };

      await PeopleRepo.upsert(updatedPerson);
      
      return {
        success: true,
        person: updatedPerson
      };
    } catch (error: any) {
      console.error('Update goals error:', error);
      throw new Error(`Failed to update goals: ${error.message}`);
    }
  });

// Update person's tags
export const updateTagsProcedure = publicProcedure
  .input(z.object({
    personId: z.string(),
    tags: z.array(z.string()),
    action: z.enum(['add', 'remove', 'replace']).default('add')
  }))
  .mutation(async ({ input }) => {
    try {
      const person = await PeopleRepo.get(input.personId);
      if (!person) {
        throw new Error('Person not found');
      }

      let updatedTags = person.tags || [];
      
      switch (input.action) {
        case 'add':
          updatedTags = [...new Set([...updatedTags, ...input.tags])];
          break;
        case 'remove':
          updatedTags = updatedTags.filter(tag => !input.tags.includes(tag));
          break;
        case 'replace':
          updatedTags = input.tags;
          break;
      }

      const updatedPerson: Person = {
        ...person,
        tags: updatedTags
      };

      await PeopleRepo.upsert(updatedPerson);
      
      return {
        success: true,
        person: updatedPerson
      };
    } catch (error: any) {
      console.error('Update tags error:', error);
      throw new Error(`Failed to update tags: ${error.message}`);
    }
  });

// Get person's notes/interactions
export const getPersonNotesProcedure = publicProcedure
  .input(z.object({
    personId: z.string(),
    limit: z.number().min(1).max(100).default(20)
  }))
  .query(async ({ input }) => {
    try {
      const person = await PeopleRepo.get(input.personId);
      if (!person) {
        throw new Error('Person not found');
      }

      const interactions = person.interactions || [];
      const sortedInteractions = interactions
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, input.limit);

      return {
        person: {
          id: person.id,
          fullName: person.fullName,
          company: person.company,
          title: person.title
        },
        interactions: sortedInteractions,
        total: interactions.length
      };
    } catch (error: any) {
      console.error('Get person notes error:', error);
      throw new Error(`Failed to get person notes: ${error.message}`);
    }
  });

// Update person's basic info
export const updatePersonInfoProcedure = publicProcedure
  .input(z.object({
    personId: z.string(),
    updates: z.object({
      fullName: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
      emails: z.array(z.string()).optional(),
      phones: z.array(z.string()).optional(),
      location: z.object({
        city: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional()
      }).optional(),
      timezone: z.string().optional(),
      cadenceDays: z.number().optional()
    })
  }))
  .mutation(async ({ input }) => {
    try {
      const person = await PeopleRepo.get(input.personId);
      if (!person) {
        throw new Error('Person not found');
      }

      const updatedPerson: Person = {
        ...person,
        ...input.updates,
        name: input.updates.fullName || person.name
      };

      await PeopleRepo.upsert(updatedPerson);
      
      return {
        success: true,
        person: updatedPerson
      };
    } catch (error: any) {
      console.error('Update person info error:', error);
      throw new Error(`Failed to update person info: ${error.message}`);
    }
  });

// Add a personal note (not linked to a person)
export const addPersonalNoteProcedure = publicProcedure
  .input(z.object({
    content: z.string(),
    type: z.enum(['text', 'voice']).default('text'),
    audioUri: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    try {
      const noteId = Date.now().toString();
      
      // Store as a voice note without personId for personal notes
      const personalNote: VoiceNote = {
        id: noteId,
        transcription: input.content,
        audioUri: input.audioUri || '',
        createdAt: Date.now(),
        processed: true,
        // personId is undefined for personal notes
      };

      await VoiceNotesRepo.upsert(personalNote);
      
      return {
        success: true,
        note: personalNote
      };
    } catch (error: any) {
      console.error('Add personal note error:', error);
      throw new Error(`Failed to add personal note: ${error.message}`);
    }
  });

// Update a personal note
export const updatePersonalNoteProcedure = publicProcedure
  .input(z.object({
    noteId: z.string(),
    content: z.string()
  }))
  .mutation(async ({ input }) => {
    try {
      const existingNote = await VoiceNotesRepo.get(input.noteId);
      if (!existingNote) {
        throw new Error('Note not found');
      }

      const updatedNote: VoiceNote = {
        ...existingNote,
        transcription: input.content
      };

      await VoiceNotesRepo.upsert(updatedNote);
      
      return {
        success: true,
        note: updatedNote
      };
    } catch (error: any) {
      console.error('Update personal note error:', error);
      throw new Error(`Failed to update personal note: ${error.message}`);
    }
  });

// Delete a personal note
export const deletePersonalNoteProcedure = publicProcedure
  .input(z.object({
    noteId: z.string()
  }))
  .mutation(async ({ input }) => {
    try {
      await VoiceNotesRepo.remove(input.noteId);
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Delete personal note error:', error);
      throw new Error(`Failed to delete personal note: ${error.message}`);
    }
  });

// Get all personal notes (not linked to people)
export const getPersonalNotesProcedure = publicProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(50)
  }))
  .query(async ({ input }) => {
    try {
      const allVoiceNotes = await VoiceNotesRepo.all();
      
      // Filter for personal notes (no personId)
      const personalNotes = allVoiceNotes
        .filter(note => !note.personId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, input.limit);
      
      return {
        notes: personalNotes,
        total: personalNotes.length
      };
    } catch (error: any) {
      console.error('Get personal notes error:', error);
      throw new Error(`Failed to get personal notes: ${error.message}`);
    }
  });

// Get all notes (both personal and people-linked) for search
export const getAllNotesProcedure = publicProcedure
  .input(z.object({
    searchQuery: z.string().optional(),
    limit: z.number().min(1).max(100).default(50)
  }))
  .query(async ({ input }) => {
    try {
      const allVoiceNotes = await VoiceNotesRepo.all();
      const allPeople = await PeopleRepo.all();
      const peopleMap = new Map(allPeople.map(p => [p.id, p]));
      
      // Combine voice notes and interaction notes
      const allNotes: Array<{
        id: string;
        type: 'voice' | 'text';
        content: string;
        personId?: string;
        personName?: string;
        createdAt: number;
        audioUri?: string;
      }> = [];
      
      // Add voice notes
      allVoiceNotes.forEach(vn => {
        allNotes.push({
          id: vn.id,
          type: 'voice',
          content: vn.transcription,
          personId: vn.personId,
          personName: vn.personId ? peopleMap.get(vn.personId)?.fullName : undefined,
          createdAt: vn.createdAt,
          audioUri: vn.audioUri,
        });
      });
      
      // Add text notes from people interactions
      allPeople.forEach(person => {
        if (person.interactions) {
          person.interactions.forEach(interaction => {
            if (interaction.channel === 'note') {
              allNotes.push({
                id: `${person.id}-${interaction.id}`,
                type: 'text',
                content: interaction.summary,
                personId: person.id,
                personName: person.fullName,
                createdAt: new Date(interaction.occurredAt).getTime(),
              });
            }
          });
        }
      });
      
      // Apply search filter if provided
      let filteredNotes = allNotes;
      if (input.searchQuery && input.searchQuery.trim()) {
        const query = input.searchQuery.toLowerCase();
        filteredNotes = allNotes.filter(note => 
          note.content.toLowerCase().includes(query) ||
          (note.personName && note.personName.toLowerCase().includes(query))
        );
      }
      
      // Sort by creation date and limit
      const sortedNotes = filteredNotes
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, input.limit);
      
      return {
        notes: sortedNotes,
        total: filteredNotes.length
      };
    } catch (error: any) {
      console.error('Get all notes error:', error);
      throw new Error(`Failed to get all notes: ${error.message}`);
    }
  });