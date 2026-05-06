import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Link as LinkIcon, FileText, Video, Plus, Trash2, ExternalLink, Calendar } from 'lucide-react';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    type: 'link',
    url: '',
    description: '',
    session_id: ''
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    try {
      setLoading(true);
      
      const { data: materialData } = await supabase
        .from('materials')
        .select(`
          *,
          sessions (
            topic,
            date
          )
        `)
        .order('created_at', { ascending: false });

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, topic, date')
        .order('date', { ascending: false });

      setMaterials(materialData || []);
      setSessions(sessionData || []);
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newMaterial,
        session_id: newMaterial.session_id || null
      };

      const { error } = await supabase
        .from('materials')
        .insert([payload]);

      if (error) throw error;
      
      setShowAdd(false);
      setNewMaterial({ title: '', type: 'link', url: '', description: '', session_id: '' });
      fetchMaterials();
    } catch (err) {
      alert('Error adding material: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchMaterials();
    } catch (err) {
      alert('Error deleting material: ' + err.message);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Video size={18} />;
      case 'pdf': return <FileText size={18} />;
      default: return <LinkIcon size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-secondary text-sm font-medium animate-pulse">Gathering resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-end justify-between gap-6 select-none cursor-default">
        <div className="space-y-1">
          <h1 className="text-display-sm text-primary font-display">Study Materials</h1>
          <p className="text-secondary">Shared resources, notebooks, and session recordings.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="btn-primary px-6 py-2.5 flex items-center gap-2"
        >
          <Plus size={20} /> Add Material
        </button>
      </header>

      {showAdd && (
        <div className="card p-8 animate-in slide-in-from-top-4 duration-500">
          <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <Plus className="text-[#6366F1]" size={20} /> New Resource
          </h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary">Title</label>
              <input 
                required
                type="text" 
                className="input" 
                placeholder="e.g., PyTorch Basics Notebook"
                value={newMaterial.title}
                onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary">Type</label>
              <select 
                className="input"
                value={newMaterial.type}
                onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value})}
              >
                <option value="link">External Link</option>
                <option value="video">Video Recording</option>
                <option value="pdf">PDF Document</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary">URL</label>
              <input 
                required
                type="url" 
                className="input" 
                placeholder="https://..."
                value={newMaterial.url}
                onChange={(e) => setNewMaterial({...newMaterial, url: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary">Related Session (Optional)</label>
              <select 
                className="input bg-void"
                value={newMaterial.session_id}
                onChange={(e) => setNewMaterial({...newMaterial, session_id: e.target.value})}
              >
                <option value="">No specific session</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.date).toLocaleDateString()} - {s.topic}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-secondary">Description</label>
              <textarea 
                className="input min-h-[100px] py-3" 
                placeholder="Brief summary of the content..."
                value={newMaterial.description}
                onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
              ></textarea>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary px-8">Cancel</button>
              <button type="submit" className="btn-primary px-8">Create Resource</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.length > 0 ? (
          materials.map((m) => (
            <div key={m.id} className="card p-6 group hover:border-[#6366F140] transition-all duration-300 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[#6366F1] bg-[#6366F110] border border-[#6366F120]`}>
                  {getTypeIcon(m.type)}
                </div>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="p-2 text-tertiary hover:text-danger-fg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-primary group-hover:text-[#6366F1] transition-colors line-clamp-1">{m.title}</h3>
                <p className="text-sm text-secondary line-clamp-2 leading-relaxed">{m.description || 'No description provided.'}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#ffffff05] flex flex-col gap-3">
                {m.sessions && (
                  <div className="flex items-center gap-2 text-[10px] text-[#6366F1] font-black uppercase tracking-widest bg-[#6366F108] px-2 py-1 rounded-md border border-[#6366F110] w-fit">
                    <Calendar size={12} /> {new Date(m.sessions.date).toLocaleDateString()} • {m.sessions.topic}
                  </div>
                )}
                <a 
                  href={m.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary w-full py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#6366F1] hover:text-white transition-all"
                >
                  <ExternalLink size={14} /> Open Resource
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center gap-4 bg-void/50 rounded-3xl border border-[#ffffff05]">
            <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center text-tertiary opacity-30">
              <BookOpen size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">No resources yet</h3>
              <p className="text-secondary max-w-xs">Start sharing materials, links, or recordings with your students.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
