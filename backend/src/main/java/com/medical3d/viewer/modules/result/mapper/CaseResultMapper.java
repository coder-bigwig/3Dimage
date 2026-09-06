package com.medical3d.viewer.modules.result.mapper;

import com.medical3d.viewer.modules.result.entity.CaseResultEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;
import java.util.UUID;

@Mapper
public interface CaseResultMapper {
    int insert(CaseResultEntity entity);
    Optional<CaseResultEntity> findPublishedById(@Param("id") UUID id);
}
