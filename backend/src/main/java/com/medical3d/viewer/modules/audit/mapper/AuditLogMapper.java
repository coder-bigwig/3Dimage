package com.medical3d.viewer.modules.audit.mapper;
import com.medical3d.viewer.modules.audit.entity.AuditLogEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface AuditLogMapper { int insert(AuditLogEntity entity); }
