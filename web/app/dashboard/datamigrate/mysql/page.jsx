"use client";
import React, { useState, useEffect } from "react";
import { datamigrateAPI } from "@/lib/api";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";

const defaultConfig = {
  type: "mysql",
  host: "",
  port: 3306,
  database: "",
  username: "",
  password: "",
  charset: "utf8mb4",
};

// 辅助函数：解析 config 字段
const parseConfig = (config) => {
  if (typeof config === "string") {
    try {
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
  return config;
};

export default function MysqlMigratePage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  // 表单相关
  const [showCreate, setShowCreate] = useState(false);
  const [sourceConfig, setSourceConfig] = useState({ ...defaultConfig });
  const [targetConfig, setTargetConfig] = useState({ ...defaultConfig });
  const [sourceDatabases, setSourceDatabases] = useState([]);
  const [sourceTables, setSourceTables] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [batchSize, setBatchSize] = useState(1000);
  const [createSchema, setCreateSchema] = useState(true);
  const [truncateTarget, setTruncateTarget] = useState(false);
  const [onlySyncSchema, setOnlySyncSchema] = useState(false);
  // 新增多步表单状态
  const [formStep, setFormStep] = useState(1);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  // 任务操作
  const [creating, setCreating] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  // 数据对比弹窗
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoadingMap, setCompareLoadingMap] = useState({});
  const [compareError, setCompareError] = useState("");
  // 在组件顶部添加：
  const [showAllTablesMap, setShowAllTablesMap] = useState({});
  const [showTablesDialog, setShowTablesDialog] = useState(false);
  const [tablesDialogContent, setTablesDialogContent] = useState([]);
  // 新增数据库弹窗状态
  const [showDatabasesDialog, setShowDatabasesDialog] = useState(false);
  const [databasesDialogContent, setDatabasesDialogContent] = useState([]);
  const [showAllDatabasesMap, setShowAllDatabasesMap] = useState({});
  // 数据对比弹窗相关状态
  const [showOnlyDiff, setShowOnlyDiff] = useState(false);

  // 获取任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await datamigrateAPI.listTasks();
      setTasks(res.data?.tasks || res.tasks || []);
    } finally {
      setLoading(false);
    }
  };

  // 查询进度
  const fetchProgress = async (taskId) => {
    const res = await datamigrateAPI.getTaskProgress(taskId);
    setProgressMap((prev) => ({ ...prev, [taskId]: res.data || res }));
  };

  // 表单：测试连接并获取数据库
  const handleTestConnection = async () => {
    setFormError("");
    setFormLoading(true);
    try {
      // 测试源库
      const res = await datamigrateAPI.testConnection(sourceConfig);
      if (res.code !== 0) {
        setFormError("源库连接失败: " + (res.msg || "连接失败"));
        setConnectionTested(false);
        return;
      }
      // 测试目标库
      const tgtRes = await datamigrateAPI.testConnection(targetConfig);
      if (tgtRes.code !== 0) {
        setFormError("目标库连接失败: " + (tgtRes.msg || "连接失败"));
        setConnectionTested(false);
        return;
      }
      // 获取源库数据库列表
      const dbRes = await datamigrateAPI.listDatabases(sourceConfig);
      if (dbRes.code !== 0) {
        setFormError(dbRes.msg || "获取数据库失败");
        setConnectionTested(false);
        return;
      }
      setSourceDatabases(dbRes.data || dbRes);
      setConnectionTested(true);
      setFormError("连接成功！");
    } catch (e) {
      setFormError(`连接失败: ${e.message}`);
      setConnectionTested(false);
    } finally {
      setFormLoading(false);
    }
  };

  // 表单：获取表
  const handleListTables = async (dbs = selectedDatabase) => {
    setFormError("");
    setFormLoading(true);
    try {
      const allTables = [];
      for (const db of dbs) {
        const config = { ...sourceConfig, type: sourceConfig.type || "mysql" };
        const res = await datamigrateAPI.listTables(config, db);
        const tables = res.data || res;
        allTables.push({ db, tables });
      }
      setSourceTables(allTables);
    } catch (e) {
      setFormError(`获取表失败: ${e.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  // 表单：创建任务
  const handleCreateTask = async () => {
    setCreating(true);
    setFormError("");
    try {
      const tablesArr = selectedTables.map(sel => `${sel.db}.${sel.table}`);
      // 强制转为 JSON 字符串数组格式
      const mainDatabase = selectedDatabase[0] || "";
      const taskData = {
        source_config: { ...sourceConfig, database: mainDatabase },
        target_config: { ...targetConfig, database: mainDatabase }, // 或者让用户输入
        database: selectedDatabase.join(","),
        tables: Array.isArray(tablesArr) ? tablesArr : (tablesArr ? [tablesArr] : []),
        batch_size: batchSize,
        create_schema: createSchema,
        truncate_target: truncateTarget,
        only_sync_schema: onlySyncSchema,
      };
      await datamigrateAPI.createTask(taskData);
      setShowCreate(false);
      fetchTasks();
    } catch (e) {
      setFormError(`任务创建失败: ${e.message || e.error_message || JSON.stringify(e)}`);
    } finally {
      setCreating(false);
    }
  };

  // 启动任务
  const handleStartTask = async (taskId) => {
    try {
      await datamigrateAPI.startTask(taskId);
      fetchTasks();
    } catch (e) {
      alert('启动任务失败：' + e.message);
    }
  };

  // 数据对比
  const handleCompare = async (task) => {
    setCompareLoadingMap(prev => ({ ...prev, [task.task_id]: true }));
    setCompareError("");
    try {
      // 解析所有库
      const dbs = Array.isArray(task.database)
        ? task.database
        : (typeof task.database === 'string' ? task.database.split(',').map(s => s.trim()).filter(Boolean) : []);
      // 解析所有表
      const allTables = Array.isArray(task.tables)
        ? task.tables
        : (typeof task.tables === 'string' ? JSON.parse(task.tables) : []);
      let allResults = [];
      let totalSource = 0, totalTarget = 0, allEqual = true;
      for (const db of dbs) {
        const tables = allTables.filter(t => t.startsWith(db + ".")).map(t => t.split(".")[1]);
        if (tables.length === 0) continue;
        const res = await datamigrateAPI.compare({
          source_config: parseConfig(task.source_config),
          target_config: parseConfig(task.target_config),
          database: db,
          tables,
        });
        if (res.code !== 0) {
          setCompareError((res.msg || "对比失败") + `（库：${db}）`);
          setCompareResult(null);
          setShowCompareDialog(true);
          setCompareLoadingMap(prev => ({ ...prev, [task.task_id]: false }));
          return;
        }
        // 合并结果
        allResults = allResults.concat(
          (res.data?.tables || []).map(row => ({ ...row, database: db }))
        );
        totalSource += res.data?.table_count_source || 0;
        totalTarget += res.data?.table_count_target || 0;
        if (!res.data?.table_count_equal) allEqual = false;
      }
      setCompareResult({
        table_count_source: totalSource,
        table_count_target: totalTarget,
        table_count_equal: allEqual,
        tables: allResults,
      });
      setShowCompareDialog(true);
    } catch (e) {
      setCompareError(e.message);
      setShowCompareDialog(true);
    } finally {
      setCompareLoadingMap(prev => ({ ...prev, [task.task_id]: false }));
    }
  };

  // 步骤切换逻辑
  const handleNextStep = async () => {
    if (formStep === 1) {
      // 测试连接并获取数据库
      setFormError("");
      setFormLoading(true);
      try {
        await datamigrateAPI.testConnection(sourceConfig);
        const res = await datamigrateAPI.listDatabases(sourceConfig);
        setSourceDatabases(res.data || res);
        setFormStep(2);
      } catch (e) {
        setFormError(`连接失败: ${e.message}`);
      } finally {
        setFormLoading(false);
      }
    } else if (formStep === 2) {
      // 获取表
      setFormError("");
      setFormLoading(true);
      try {
        const allTables = [];
        for (const db of selectedDatabase) {
          const config = { ...sourceConfig, type: sourceConfig.type || "mysql" };
          const res = await datamigrateAPI.listTables(config, db);
          const tables = res.data || res;
          allTables.push({ db, tables });
        }
        setSourceTables(allTables);
        setFormStep(3);
      } catch (e) {
        setFormError(`获取表失败: ${e.message}`);
      } finally {
        setFormLoading(false);
      }
    } else if (formStep === 3) {
      setFormStep(4);
    }
  };

  const handlePrevStep = () => {
    if (formStep > 1) setFormStep(formStep - 1);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 表单重置
  const resetForm = () => {
    setSourceConfig({ ...defaultConfig });
    setTargetConfig({ ...defaultConfig });
    setSourceDatabases([]);
    setSourceTables([]);
    setSelectedDatabase([]);
    setSelectedTables([]);
    setBatchSize(1000);
    setCreateSchema(true);
    setTruncateTarget(false);
    setOnlySyncSchema(false);
    setFormStep(1);
    setFormError("");
    setFormLoading(false);
    setCreating(false);
    setConnectionTested(false);
  };

  return (
    <div className="p-6 w-full max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">MySQL 数据迁移任务</h1>
        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>新增迁移任务</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl w-full">
            <DialogHeader>
              <DialogTitle>新增 MySQL 数据迁移任务</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {formError && <div className="text-red-500 text-sm">{formError}</div>}
              {formStep === 1 && (
                <>
                  <div className="font-semibold mb-2">源数据库配置</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input placeholder="主机" value={sourceConfig.host} onChange={e => setSourceConfig({ ...sourceConfig, host: e.target.value })} />
                    <Input placeholder="端口" type="number" value={sourceConfig.port} onChange={e => setSourceConfig({ ...sourceConfig, port: Number(e.target.value) })} />
                    <Input placeholder="用户名" value={sourceConfig.username} onChange={e => setSourceConfig({ ...sourceConfig, username: e.target.value })} />
                    <Input placeholder="密码" type="password" value={sourceConfig.password} onChange={e => setSourceConfig({ ...sourceConfig, password: e.target.value })} />
                    <Input placeholder="字符集" value={sourceConfig.charset} onChange={e => setSourceConfig({ ...sourceConfig, charset: e.target.value })} />
                  </div>
                  <hr className="my-4 border-t border-gray-300 dark:border-gray-700" />
                  <div className="font-semibold mb-2">目标数据库配置</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input placeholder="主机" value={targetConfig.host} onChange={e => setTargetConfig({ ...targetConfig, host: e.target.value })} />
                    <Input placeholder="端口" type="number" value={targetConfig.port} onChange={e => setTargetConfig({ ...targetConfig, port: Number(e.target.value) })} />
                    <Input placeholder="用户名" value={targetConfig.username} onChange={e => setTargetConfig({ ...targetConfig, username: e.target.value })} />
                    <Input placeholder="密码" type="password" value={targetConfig.password} onChange={e => setTargetConfig({ ...targetConfig, password: e.target.value })} />
                    <Input placeholder="字符集" value={targetConfig.charset} onChange={e => setTargetConfig({ ...targetConfig, charset: e.target.value })} />
                  </div>
                  <Button
                    onClick={handleTestConnection}
                    loading={formLoading ? true : undefined}
                    disabled={formLoading}
                    className="w-full mt-2"
                  >
                    测试连接并获取数据库
                  </Button>
                </>
              )}
              {formStep === 2 && (
                <>
                  <div className="font-semibold mb-2 flex items-center justify-between">
                    <span>选择要迁移的库（可多选）</span>
                    <button
                      type="button"
                      className="text-blue-600 text-xs hover:underline"
                      onClick={() => {
                        if (selectedDatabase.length === sourceDatabases.length) {
                          setSelectedDatabase([]);
                        } else {
                          setSelectedDatabase([...sourceDatabases]);
                        }
                      }}
                    >
                      {selectedDatabase.length === sourceDatabases.length ? "取消全选" : "全选"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sourceDatabases.map((db) => (
                      <label key={db} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedDatabase.includes(db)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedDatabase([...selectedDatabase, db]);
                            } else {
                              setSelectedDatabase(selectedDatabase.filter(d => d !== db));
                            }
                          }}
                        />
                        <span>{db}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {formStep === 3 && (
                <>
                  <div className="font-semibold mb-2 flex items-center justify-between">
                    <span>选择要迁移的表（可多选）</span>
                    <button
                      type="button"
                      className="text-blue-600 text-xs hover:underline"
                      onClick={() => {
                        const all = sourceTables.flatMap(group =>
                          Array.isArray(group.tables)
                            ? group.tables.map(table => ({ db: group.db, table }))
                            : []
                        );
                        if (selectedTables.length === all.length) {
                          setSelectedTables([]);
                        } else {
                          setSelectedTables(all);
                        }
                      }}
                    >
                      {selectedTables.length === sourceTables.flatMap(g => g.tables).length ? "取消全选" : "全选"}
                    </button>
                  </div>
                  <div className="h-40 overflow-y-auto border rounded p-2 space-y-2">
                    {sourceTables.map(group => (
                      <div key={group.db}>
                        <div className="font-semibold text-sm mb-1">{group.db}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.isArray(group.tables) ? group.tables.map(table => {
                            const checked = selectedTables.some(sel => sel.db === group.db && sel.table === table);
                            return (
                              <label key={table} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedTables([...selectedTables, { db: group.db, table }]);
                                    } else {
                                      setSelectedTables(selectedTables.filter(sel => !(sel.db === group.db && sel.table === table)));
                                    }
                                  }}
                                />
                                <span>{table}</span>
                              </label>
                            );
                          }) : <span className="text-xs text-red-500">获取表失败</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 items-center">
                    <span>批量大小</span>
                    <Input type="number" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="w-24" />
                    <label><input type="checkbox" checked={createSchema} onChange={e => setCreateSchema(e.target.checked)} /> 自动建表</label>
                    <label><input type="checkbox" checked={truncateTarget} onChange={e => setTruncateTarget(e.target.checked)} /> 清空目标表</label>
                    <label><input type="checkbox" checked={onlySyncSchema} onChange={e => setOnlySyncSchema(e.target.checked)} /> 只同步表结构（不导入数据）</label>
                  </div>
                </>
              )}
              {formStep === 4 && (
                <>

                  <div className="space-y-2 text-sm overflow-y-auto" style={{ maxHeight: 300 }}>
                    <div><b>源库地址：</b>{sourceConfig.host}:{sourceConfig.port}（用户：{sourceConfig.username}）</div>
                    <div><b>目标库地址：</b>{targetConfig.host}:{targetConfig.port}（用户：{targetConfig.username}）</div>
                    <div><b>迁移库：</b>{selectedDatabase.join(", ")}</div>
                    <div><b>迁移表：</b>{selectedTables.map(sel => `${sel.db}.${sel.table}`).join(", ")}</div>
                    <div><b>批量大小：</b>{batchSize}</div>
                    <div><b>自动建表：</b>{createSchema ? "是" : "否"}，<b>清空目标表：</b>{truncateTarget ? "是" : "否"}，<b>只同步表结构：</b>{onlySyncSchema ? "是" : "否"}</div>
                  </div>
                </>
              )}
              <DialogFooter>
                {formStep > 1 && <Button variant="outline" onClick={handlePrevStep}>上一步</Button>}
                {formStep < 4 && <Button onClick={handleNextStep} loading={formLoading ? true : undefined} disabled={formLoading || (formStep === 1 && !connectionTested) || (formStep === 2 && !selectedDatabase.length) || (formStep === 3 && !selectedTables.length)}>下一步</Button>}
                {formStep === 4 && <Button onClick={handleCreateTask} loading={creating ? true : undefined} disabled={creating}>提交任务</Button>}
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* 任务列表表格加滚动条 */}
      <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务ID</TableHead>
                <TableHead>数据库</TableHead>
                <TableHead>表</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>错误信息</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.task_id}>
                  <TableCell className="min-w-[120px] break-all">{task.task_id}</TableCell>
                  <TableCell className="min-w-[120px] break-all max-w-[300px]">
                    <div style={{ maxHeight: 60, overflow: 'hidden', position: 'relative' }}>
                      {(() => {
                        let dbArr = [];
                        if (typeof task.database === 'string') dbArr = task.database.split(',').map(s => s.trim()).filter(Boolean);
                        else if (Array.isArray(task.database)) dbArr = task.database;
                        const showAll = showAllDatabasesMap[task.task_id];
                        const display = showAll ? dbArr.join(", ") : dbArr.slice(0, 5).join(", ") + (dbArr.length > 5 ? ' ...' : '');
                        return display;
                      })()}
                    </div>
                    {(() => {
                      let dbArr = [];
                      if (typeof task.database === 'string') dbArr = task.database.split(',').map(s => s.trim()).filter(Boolean);
                      else if (Array.isArray(task.database)) dbArr = task.database;
                      if (dbArr.length > 1) {
                        return (
                          <span
                            className="text-blue-400 underline font-bold cursor-pointer ml-2 hover:text-blue-300"
                            onClick={e => {
                              e.stopPropagation();
                              setDatabasesDialogContent(dbArr);
                              setShowDatabasesDialog(true);
                            }}
                          >
                            查看全部
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </TableCell>
                  <TableCell className="min-w-[240px] break-all max-w-[400px]">
                    <div style={{ maxHeight: 100, overflow: 'hidden', position: 'relative' }}>
                      {(() => {
                        let tablesArr = [];
                        if (Array.isArray(task.tables)) tablesArr = task.tables;
                        else if (typeof task.tables === 'string') {
                          try {
                            const arr = JSON.parse(task.tables);
                            if (Array.isArray(arr)) tablesArr = arr;
                          } catch {}
                        }
                        const showAll = task._showAllTables;
                        const display = tablesArr.slice(0, 10).join(", ") + (tablesArr.length > 10 ? ' ...' : '');
                        return display;
                      })()}
                    </div>
                    {(() => {
                      let tablesArr = [];
                      if (Array.isArray(task.tables)) tablesArr = task.tables;
                      else if (typeof task.tables === 'string') {
                        try {
                          const arr = JSON.parse(task.tables);
                          if (Array.isArray(arr)) tablesArr = arr;
                        } catch {}
                      }
                      if (tablesArr.length > 10) {
                        return (
                          <span
                            className="text-blue-400 underline font-bold cursor-pointer ml-2 hover:text-blue-300"
                            onClick={e => {
                              e.stopPropagation();
                              setTablesDialogContent(tablesArr);
                              setShowTablesDialog(true);
                            }}
                          >
                            查看全部
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </TableCell>
                  <TableCell className="min-w-[110px] break-all">{task.status}</TableCell>
                  <TableCell className="min-w-[180px] break-all">
                    {task.error_message && (
                      <div className="text-xs text-red-500">{task.error_message}</div>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[180px] break-all">
                    <Button size="sm" onClick={() => fetchProgress(task.task_id)}>查看进度</Button>
                    {progressMap[task.task_id] && (
                      <div className="mt-1">
                        <Progress value={progressMap[task.task_id].progress} />
                        <div className="text-xs text-gray-500">{progressMap[task.task_id].progress?.toFixed(1)}%</div>
                        {progressMap[task.task_id].error_message && <div className="text-xs text-red-500">{progressMap[task.task_id].error_message}</div>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[120px] break-all">
                    {task.status === "pending" && <Button size="sm" onClick={() => handleStartTask(task.task_id)}>启动</Button>}
                    {task.status === "running" && <Button size="sm">取消</Button>}
                    <Button
                      size="sm"
                      onClick={() => handleCompare(task)}
                      disabled={!!compareLoadingMap[task.task_id]}
                    >
                      {compareLoadingMap[task.task_id] ? "正在对比，请稍候…" : "数据对比"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
      {/* 比对结果弹窗 */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-6xl w-full">
          <DialogHeader>
            <DialogTitle>数据对比结果</DialogTitle>
          </DialogHeader>
          {compareLoadingMap[compareResult?.task_id] ? <div>对比中...</div> : compareError ? <div className="text-red-500">{compareError}</div> : compareResult && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {/* 总数统计 */}
                  <div>
                    总源库表数：{compareResult.table_count_source}，总目标库表数：{compareResult.table_count_target}，
                    {compareResult.table_count_equal ? <span className="text-green-600">表数量一致</span> : <span className="text-red-500">表数量不一致</span>}
                  </div>
                  {/* 分库统计 */}
                  {(() => {
                    // 按库分组统计
                    const dbMap = {};
                    (compareResult.tables || []).forEach(row => {
                      if (!row.database) return;
                      if (!dbMap[row.database]) dbMap[row.database] = { source: 0, target: 0 };
                      if (row.exists_in_source) dbMap[row.database].source++;
                      if (row.exists_in_target) dbMap[row.database].target++;
                    });
                    return Object.entries(dbMap).map(([db, cnt]) => (
                      <div key={db} className="text-xs pl-2">
                        <span className="font-bold">{db}</span>：源库表数 {cnt.source}，目标库表数 {cnt.target}，
                        {cnt.source === cnt.target ? <span className="text-green-600">一致</span> : <span className="text-red-500">不一致</span>}
                      </div>
                    ));
                  })()}
                </div>
                <Button size="sm" variant={showOnlyDiff ? "default" : "outline"} onClick={() => setShowOnlyDiff(v => !v)}>
                  {showOnlyDiff ? "显示全部" : "只显示差异"}
                </Button>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>数据库</TableHead>
                      <TableHead>表名</TableHead>
                      <TableHead>源库行数</TableHead>
                      <TableHead>目标库行数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compareResult.tables
                      .filter(row => !!row.table)
                      .sort((a, b) => {
                        // 差异表靠前：行数不一致或表结构不一致
                        const aDiff = a.row_count_source !== a.row_count_target || !a.exists_in_source || !a.exists_in_target;
                        const bDiff = b.row_count_source !== b.row_count_target || !b.exists_in_source || !b.exists_in_target;
                        if (aDiff === bDiff) return 0;
                        return aDiff ? -1 : 1;
                      })
                      .filter(row => {
                        if (!showOnlyDiff) return true;
                        // 只显示有差异的表
                        return row.row_count_source !== row.row_count_target || !row.exists_in_source || !row.exists_in_target;
                      })
                      .map(row => (
                        <TableRow key={(row.database || '') + '.' + row.table}>
                          <TableCell>{row.database}</TableCell>
                          <TableCell>{row.table}</TableCell>
                          <TableCell className={row.row_count_source !== row.row_count_target ? "text-red-500 font-bold" : ""}>{row.row_count_source}</TableCell>
                          <TableCell className={row.row_count_source !== row.row_count_target ? "text-red-500 font-bold" : ""}>{row.row_count_target}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* 表名弹窗 */}
      <Dialog open={showTablesDialog} onOpenChange={setShowTablesDialog}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>全部表名</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto text-xs whitespace-pre-line break-all">
            {tablesDialogContent.map((name, idx) => (
              <div key={idx}>{name}</div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* 数据库弹窗 */}
      <Dialog open={showDatabasesDialog} onOpenChange={setShowDatabasesDialog}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>全部数据库</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto text-xs whitespace-pre-line break-all">
            {databasesDialogContent.map((name, idx) => (
              <div key={idx}>{name}</div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 