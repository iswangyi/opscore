'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function ResourceTypeSelector({ selectedResourceTypes, setSelectedResourceTypes, idPrefix = '' }) {
  return (
    <div className="space-y-2">
      <Label>选择资源类型</Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}deployments`}
            checked={selectedResourceTypes.deployments}
            onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, deployments: !!checked })}
          />
          <label htmlFor={`${idPrefix}deployments`} className="text-sm font-medium">
            Deployments
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}configmaps`}
            checked={selectedResourceTypes.configmaps}
            onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, configmaps: !!checked })}
          />
          <label htmlFor={`${idPrefix}configmaps`} className="text-sm font-medium">
            Configmaps
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}statefulsets`}
            checked={selectedResourceTypes.statefulsets}
            onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, statefulsets: !!checked })}
          />
          <label htmlFor={`${idPrefix}statefulsets`} className="text-sm font-medium">
            StatefulSets
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}services`} checked={selectedResourceTypes.services} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, services: !!checked })} />
          <label htmlFor={`${idPrefix}services`} className="text-sm font-medium">
            Services
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}secrets`} checked={selectedResourceTypes.secrets} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, secrets: !!checked })} />
          <label htmlFor={`${idPrefix}secrets`} className="text-sm font-medium">
            Secrets
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}pvcs`} checked={selectedResourceTypes.pvcs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, pvcs: !!checked })} />
          <label htmlFor={`${idPrefix}pvcs`} className="text-sm font-medium">
            PVCs
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}pvs`} checked={selectedResourceTypes.pvs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, pvs: !!checked })} />
          <label htmlFor={`${idPrefix}pvs`} className="text-sm font-medium">
            PVs
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}cronjobs`} checked={selectedResourceTypes.cronjobs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, cronjobs: !!checked })} />
          <label htmlFor={`${idPrefix}cronjobs`} className="text-sm font-medium">
            CronJobs
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}jobs`} checked={selectedResourceTypes.jobs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, jobs: !!checked })} />
          <label htmlFor={`${idPrefix}jobs`} className="text-sm font-medium">
            Jobs
          </label>
        </div>
      </div>
    </div>
  );
}
