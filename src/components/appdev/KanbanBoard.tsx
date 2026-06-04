import { useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { PROJECT_STAGE_LABELS, PROJECT_STAGE_VALUES } from '@/constants';
import type { AppProject, Company, ProjectStage } from '@/types';
import { cn } from '@/utils/cn';
import { STAGE_ACCENT } from '@/utils/projectStage';

const COLUMN_PREFIX = 'column:';

interface KanbanBoardProps {
  projects: AppProject[];
  companiesById: Map<string, Company>;
  onMove: (id: string, stage: ProjectStage) => void;
  onOpenProject: (project: AppProject) => void;
  onAddInStage: (stage: ProjectStage) => void;
}

export function KanbanBoard({
  projects,
  companiesById,
  onMove,
  onOpenProject,
  onAddInStage,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const byStage = useMemo(() => {
    const map = new Map<ProjectStage, AppProject[]>();
    for (const stage of PROJECT_STAGE_VALUES) map.set(stage, []);
    for (const project of projects) map.get(project.stage)?.push(project);
    return map;
  }, [projects]);

  const activeProject = activeId ? projectsById.get(activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    const targetStage: ProjectStage | undefined = overId.startsWith(COLUMN_PREFIX)
      ? (overId.slice(COLUMN_PREFIX.length) as ProjectStage)
      : projectsById.get(overId)?.stage;
    const moved = projectsById.get(String(active.id));
    if (moved && targetStage && moved.stage !== targetStage) {
      onMove(moved.id, targetStage);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {PROJECT_STAGE_VALUES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            projects={byStage.get(stage) ?? []}
            companiesById={companiesById}
            onOpenProject={onOpenProject}
            onAdd={() => onAddInStage(stage)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? (
          <ProjectCard
            project={activeProject}
            company={companiesById.get(activeProject.companyId) ?? null}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  stage: ProjectStage;
  projects: AppProject[];
  companiesById: Map<string, Company>;
  onOpenProject: (project: AppProject) => void;
  onAdd: () => void;
}

function KanbanColumn({ stage, projects, companiesById, onOpenProject, onAdd }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${stage}` });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 dark:bg-slate-800/40">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', STAGE_ACCENT[stage])} aria-hidden />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {PROJECT_STAGE_LABELS[stage]}
          </h3>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {projects.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add project to ${PROJECT_STAGE_LABELS[stage]}`}
          className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex max-h-[64vh] min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-3',
          isOver && 'rounded-b-xl bg-slate-200/60 dark:bg-slate-700/30'
        )}
      >
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No projects</p>
          ) : (
            projects.map((project) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                company={companiesById.get(project.companyId) ?? null}
                onOpen={() => onOpenProject(project)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

interface SortableProjectCardProps {
  project: AppProject;
  company: Company | null;
  onOpen: () => void;
}

function SortableProjectCard({ project, company, onOpen }: SortableProjectCardProps) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } =
    useSortable({ id: project.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <ProjectCard
      ref={setNodeRef}
      style={style}
      {...attributes}
      project={project}
      company={company}
      onOpen={onOpen}
      handleRef={setActivatorNodeRef}
      handleProps={listeners}
      dragging={isDragging}
    />
  );
}
