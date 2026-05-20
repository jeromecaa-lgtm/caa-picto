import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getMyPersons, getPersonChoices } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

const ALLOWED = ['display_name','background_color','colorblind_mode','use_ai',
  'auto_select','show_core','show_verbs','show_qualifiers','complexity',
  'display_speed_ms','max_pictograms','picto_size','voice_type'];

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [persons, setPersons] = useState([]);
  const [currentPerson, setCurrentPerson] = useState(null);
  const [choices, setChoices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadPersons();
  }, [user]);

  async function loadPersons() {
    setLoading(true);
    const list = await getMyPersons(user.id);
    setPersons(list);

    // Restaurer la personne depuis localStorage
    const savedId = localStorage.getItem('caa-current-person');
    const saved = savedId && list.find(p => p.id === savedId);

    if (saved) {
      await selectPerson(saved);
    } else if (list.length === 1) {
      await selectPerson(list[0]);
    }

    setLoading(false);
  }

  async function loadChoices(personId) {
    const id = personId || currentPerson?.id;
    if (!id) return;
    const c = await getPersonChoices(id);
    setChoices(c);
  }

  async function selectPerson(person) {
    setCurrentPerson(person);
    localStorage.setItem('caa-current-person', person.id);
    if (person.background_color) {
      document.documentElement.style.setProperty('--bg', person.background_color);
    }
    const c = await getPersonChoices(person.id);
    setChoices(c);
  }

  async function savePerson(updates) {
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
    );
    const { error } = await supabase.from('persons').update(clean).eq('id', currentPerson.id);
    if (!error) {
      setCurrentPerson((p) => ({ ...p, ...clean }));
      if (clean.background_color) {
        document.documentElement.style.setProperty('--bg', clean.background_color);
      }
    }
    return { error };
  }

  async function saveChoice(word, arasaacId) {
    const key = word.toLowerCase();
    setChoices((c) => ({ ...c, [key]: arasaacId }));
    await supabase.from('pictogram_choices').upsert(
      { person_id: currentPerson.id, word: key, arasaac_id: arasaacId },
      { onConflict: 'person_id,word' }
    );
  }

  function clearCurrentPerson() {
    setCurrentPerson(null);
    setChoices({});
    localStorage.removeItem('caa-current-person');
    document.documentElement.style.setProperty('--bg', '#F0EDE8');
  }

  return (
    <ProfileContext.Provider value={{
      persons, currentPerson, choices, loading,
      selectPerson, savePerson, saveChoice, loadPersons, clearCurrentPerson, loadChoices,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}