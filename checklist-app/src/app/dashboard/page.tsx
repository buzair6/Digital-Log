import React from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardStats from '@/components/DashboardStats';

export const metadata = { title: 'My Checklists' };

export default async function UserDashboard() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">My Checklists</h1>
        {/* @ts-expect-error Server component includes client component */}
        <DashboardStats role="USER" />
      </main>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Check } from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(storedUser);
    if (userData.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    setUser(userData);
    fetchTodos(userData.id);
  }, [router]);

  const fetchTodos = async (userId: string) => {
    try {
      const response = await fetch(`/api/todos?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo,
          userId: user.id,
        }),
      });

      if (response.ok) {
        const todo = await response.json();
        setTodos([...todos, todo]);
        setNewTodo('');
      }
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (response.ok) {
        setTodos(todos.map(t => (t.id === id ? { ...t, completed: !completed } : t)));
      }
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(todos.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Checklist</h1>
              <p className="text-gray-600 mt-1">Hello, {user?.name}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Add Todo Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={addTodo} className="flex gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new checklist item..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              Add
            </button>
          </form>
        </div>

        {/* Todos List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {todos.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No checklist items yet. Add one to get started!</p>
            </div>
          ) : (
            <ul className="divide-y">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="p-4 hover:bg-gray-50 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                        todo.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {todo.completed && <Check size={16} className="text-white" />}
                    </button>
                    <span
                      className={`flex-1 ${
                        todo.completed
                          ? 'line-through text-gray-400'
                          : 'text-gray-900'
                      }`}
                    >
                      {todo.title}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-red-600 hover:text-red-700 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
